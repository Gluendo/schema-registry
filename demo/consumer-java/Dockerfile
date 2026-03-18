FROM eclipse-temurin:21-jdk-alpine

RUN apk add --no-cache curl bash && \
    curl -Ls https://sh.jbang.dev | bash -s - app setup
ENV PATH="/root/.jbang/bin:${PATH}"

WORKDIR /app
COPY EmployeeConsumer.java .

# Pre-fetch dependencies
RUN jbang build EmployeeConsumer.java

CMD ["jbang", "run", "EmployeeConsumer.java"]
