# frontend 브랜치: Java 21 + Gradle Wrapper로 bootJar 생산 후 실행
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app

COPY gradle/wrapper/ gradle/wrapper/
COPY gradlew gradlew.bat ./
COPY build.gradle.kts settings.gradle.kts ./
RUN chmod +x gradlew
COPY src/ src/

RUN ./gradlew bootJar -x test --no-daemon \
	&& J=$(find /app/build/libs -maxdepth 1 -name "*SNAPSHOT.jar" ! -name "*-plain.jar" -print -quit) \
	&& test -n "$J" && cp "$J" /app/app.jar

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=builder /app/app.jar app.jar
EXPOSE 8080
ENV PORT=8080
CMD ["sh", "-c", "exec java -Dserver.port=${PORT:-8080} -jar /app/app.jar"]
