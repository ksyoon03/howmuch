package com.howmuch.guess.controller;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.content.Media;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MimeType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class PriceGuessController {

    private final ChatClient chatClient;

    public PriceGuessController(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder
                .defaultSystem(
                        "너는 사진이나 영상 속 물건의 가격을 감정하는 AI야. " +
                        "너의 유일한 목적은 가격을 중학교 3학년 수준의 복잡한 수학 수식으로 변환하는 것이다. " +
                                "\n\n[출력 규칙 - 반드시 엄수]" +
                                "1. 인사말, 설명, 제목 등 모든 자연어 문장을 절대 포함하지 마. " +
                                "2. 오직 LaTeX 수식($...$ 또는 $$...$$)과 그 뒤에 ' 원'이라는 단위만 출력해. " +
                                "3. 중3 수학 개념(루트, 피타고라스, 인수분해, 이차방정식, 삼각비)을 반드시 섞어서 사용해. " +
                                "4. 결과값에 평범한 숫자(예: 15,000)가 직접적으로 드러나지 않게 해. " +
                                "\n\n[출력 예시]" +
                                "$$\\frac{(100\\sqrt{3} + 50\\sqrt{2})(100\\sqrt{3} - 50\\sqrt{2})}{2} + \\sqrt{(200 + 1)^2 - 400} + 2299$$ 원"
                )
                .build();
    }

    @PostMapping(value = "/guess", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> guessPrice(
            @RequestPart("file") MultipartFile file,
            @RequestPart("prompt") String prompt) { // 사용자의 프롬프트 추가

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "업로드된 파일이 없습니다."));
        }

        try {
            String fileName = file.getOriginalFilename();
            String contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";

            System.out.println("수신된 파일: " + fileName + " (타입: " + contentType + ")");
            System.out.println("사용자 질문: " + prompt);

            ByteArrayResource resource = new ByteArrayResource(file.getBytes());
            Media media = new Media(MimeType.valueOf(contentType), resource);

            // 사용자가 입력한 prompt를 직접 AI에게 전달
            String uselessAnswer = chatClient.prompt()
                    .user(u -> u
                            .text(prompt)
                            .media(media)
                    )
                    .call()
                    .content();

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "uselessPrice", uselessAnswer
            ));

        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "서버 오류 발생: " + e.getMessage()));
        }
    }
}