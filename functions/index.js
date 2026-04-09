/**
 * Firebase Cloud Function: 새 콘티 저장 시 푸시 알림 발송
 *
 * 배포 방법:
 *   1. npm install -g firebase-tools
 *   2. firebase login
 *   3. firebase use score-fetcher-db
 *   4. cd functions && npm install
 *   5. firebase deploy --only functions
 */

const { onValueCreated } = require("firebase-functions/v2/database");
const admin = require("firebase-admin");

admin.initializeApp();

exports.notifyNewConti = onValueCreated(
    { ref: "/history/{id}", region: "us-central1" },
    async (event) => {
        const data = event.data.val();

        // 내용 요약: 번호로 시작하는 곡 줄 최대 4개 추출
        const rawText = (data && data.text) ? data.text : '';
        const contiTitle = (data && data.title) ? data.title : '';
        const senderToken = (data && data.senderToken) ? data.senderToken : null;
        
        // 대량 데이터 임포트 / 스크립트 업로드 시 푸시 차단 플래그
        if (data && data.isImport === true) {
            console.log("대량 임포트 데이터이므로 푸시 알림을 생략합니다.");
            return null;
        }
        const songLines = rawText.split('\n')
            .map(l => l.trim())
            .filter(l => /^(찬\d+|\d+)/.test(l))
            .slice(0, 4);
        const songSummary = songLines.length > 0
            ? songLines.join(' · ')
            : rawText.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 3).join(' · ');
        const summary = contiTitle
            ? `[${contiTitle}] ${songSummary}`
            : songSummary;

        // 저장된 FCM 토큰 전체 가져오기
        const tokensSnapshot = await admin.database().ref("/fcm_tokens").once("value");
        if (!tokensSnapshot.exists()) {
            console.log("등록된 FCM 토큰이 없습니다.");
            return null;
        }

        // Firebase Realtime DB는 POST할 때마다 고유 키로 저장 → 중복 제거 후 추출
        const tokenEntries = tokensSnapshot.val();
        const tokenKeyMap = {};  // token → 첫 번째 DB 키 (만료 토큰 정리용)
        Object.entries(tokenEntries).forEach(([key, token]) => {
            if (token && token !== senderToken && !tokenKeyMap[token]) {
                tokenKeyMap[token] = key;
            }
        });
        const tokens = Object.keys(tokenKeyMap);

        if (tokens.length === 0) {
            console.log("유효한 토큰이 없습니다.");
            return null;
        }

        const message = {
            // notification 필드를 쓰면 FCM이 자동 표시 + onBackgroundMessage 양쪽에서
            // showNotification()이 호출되어 알림이 2개 뜨는 버그 발생.
            // data-only 메시지로 보내고 표시는 SW onBackgroundMessage 에서만 담당.
            data: {
                title: "새 콘티가 등록되었습니다 ♬",
                body:  summary || "새 콘티가 등록되었습니다. 지금 확인해보세요!"
            },
            webpush: {
                headers: { Urgency: "high" }
            },
            tokens
        };

        // 알림센터에 기록 (FCM 발송 여부와 무관하게 항상 저장)
        const contiKey = event.params.id;
        await admin.database().ref("/notifications").push({
            type: "new_conti",
            title: contiTitle || "새 콘티가 등록되었습니다",
            body: summary || "",
            conti_key: contiKey,
            created_at: Date.now()
        });
        console.log("알림센터 기록 완료:", contiKey);

        try {
            const response = await admin.messaging().sendEachForMulticast(message);
            console.log(`성공: ${response.successCount}개 / 실패: ${response.failureCount}개`);

            // 만료·무효 토큰 정리
            const removePromises = [];
            response.responses.forEach((resp, i) => {
                if (!resp.success) {
                    const dbKey = tokenKeyMap[tokens[i]];
                    console.warn(`토큰 제거: ${tokens[i]} — ${resp.error?.message}`);
                    if (dbKey) removePromises.push(
                        admin.database().ref(`/fcm_tokens/${dbKey}`).remove()
                    );
                }
            });
            await Promise.all(removePromises);
        } catch (err) {
            console.error("sendEachForMulticast 실패:", err);
        }

        return null;
    }
);
