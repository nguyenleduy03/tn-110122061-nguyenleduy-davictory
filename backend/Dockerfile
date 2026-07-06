FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src src
RUN mvn clean package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache curl
WORKDIR /app
COPY --from=build /build/target/*.jar app.jar
RUN mkdir -p /app/credentials /app/tokens /app/logs
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=10s --retries=5 --start-period=120s \
  CMD curl -sf -o /dev/null 'http://localhost:8080/api/test-structure/sessions?testType=ACADEMIC' || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
