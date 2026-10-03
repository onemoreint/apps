# Compila y ejecuta el backend. Contexto: carpeta backend/
FROM gradle:8.11.1-jdk21 AS build
WORKDIR /src
COPY . .
RUN gradle --no-daemon bootJar -x test

FROM eclipse-temurin:21-jre
RUN useradd --system --uid 10001 acc
WORKDIR /app
COPY --from=build /src/build/libs/*.jar app.jar
USER acc
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
