# 1. 빌드 단계 (Gradle과 Java 21을 사용하여 jar 파일 생성)
FROM gradle:jdk21 AS builder
WORKDIR /app

# Gradle 관련 파일 및 소스 코드 복사
COPY build.gradle.kts settings.gradle.kts ./
COPY src ./src

# 테스트를 제외하고 프로젝트 빌드
RUN gradle clean build -x test

# 2. 실행 단계 (가벼운 JRE 21 이미지를 사용하여 앱 실행)
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# 빌드된 jar 파일을 복사
COPY --from=builder /app/build/libs/*.jar app.jar

# 포트 노출 (기본 8080)
EXPOSE 8080

# 애플리케이션 실행
ENTRYPOINT ["java", "-jar", "app.jar"]
