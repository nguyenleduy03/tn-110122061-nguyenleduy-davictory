package com.victory.aiwriting;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import java.nio.file.Paths;

@SpringBootApplication
@EnableAsync
public class AiWritingApplication {

    public static void main(String[] args) {
        var tmpDir = Paths.get(System.getProperty("user.dir"), "data", "tmp").toAbsolutePath().toString();
        System.setProperty("java.io.tmpdir", tmpDir);
        SpringApplication.run(AiWritingApplication.class, args);
    }
}
