import { Readable } from 'node:stream';
import { getSteamChatObject } from './utils/responseGenerators.js'

export function createChatStream(requestBody) {
    const stream = new Readable({
        read() { }
    });

    let count = 0;
    const maxCount = 500; // 충분히 많은 청크 수로 설정

    function sendData() {
        setTimeout(() => {
            if (count === 0) {
                // 첫 청크에서 스트림 리셋
                stream.push(`data: ${getSteamChatObject(requestBody.messages, true)}\n\n`);
            } else {
                const chunk = getSteamChatObject(requestBody.messages, false);
                const parsedChunk = JSON.parse(chunk);
                
                stream.push(`data: ${chunk}\n\n`);
                
                // finish_reason이 "stop"이면 종료
                if (parsedChunk.choices[0].finish_reason === "stop") {
                    stream.push(`data: [DONE]\n\n`);
                    stream.push(null);
                    return;
                }
                
                // 최대 청크 수에 도달하면 강제 종료
                if (count >= maxCount - 1) {
                    stream.push(`data: [DONE]\n\n`);
                    stream.push(null);
                    return;
                }
            }
            count++;
            sendData();
        }, 50); // 더 빠른 타이핑 효과 (50ms)
    }

    sendData(); // Start sending data

    return stream;
}