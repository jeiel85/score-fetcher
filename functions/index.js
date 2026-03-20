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
    { ref: "/history/{id}", region: "asia-northeast3" },   // 서울 리전 (원하면 변경)
    async (event) => {
        const data = event.data.val();
        const contiTitle = (data && data.title) ? data.title : "새 콘티";

        // 저장된 FCM 토큰 전체 가져오기
        const tokensSnapshot = await admin.database().ref("/fcm_tokens").once("value");
        if (!tokensSnapshot.exists()) {
            console.log("등록된 FCM 토큰이 없습니다.");
            return null;
        }

        // Firebase Realtime DB는 POST할 때마다 고유 키로 저장 → 값 배열로 추출
        const tokenEntries = tokensSnapshot.val();
        const tokens = Object.values(tokenEntries).filter(Boolean);

        if (tokens.length === 0) {
            console.log("유효한 토큰이 없습니다.");
            return null;
        }

        const message = {
            notification: {
                title: "새로운 콘티가 등록되었습니다 🎶",
                body:  `${contiTitle} - 지금 확인해보세요!`
            },
            webpush: {
                notification: {
                    icon:  "/icon.png",
                    badge: "/icon.png",
                    tag:   "new-conti",
                    renotify: true
                },
                fcmOptions: { link: "/" }
            },
            tokens
        };

        try {
            const response = await admin.messaging().sendEachForMulticast(message);
            console.log(`성공: ${response.successCount}개 / 실패: ${response.failureCount}개`);

            // 만료·무효 토큰 정리
            const removePromises = [];
            const tokenKeys = Object.keys(tokenEntries);
            response.responses.forEach((resp, i) => {
                if (!resp.success) {
                    console.warn(`토큰 제거: ${tokens[i]} — ${resp.error?.message}`);
                    removePromises.push(
                        admin.database().ref(`/fcm_tokens/${tokenKeys[i]}`).remove()
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
