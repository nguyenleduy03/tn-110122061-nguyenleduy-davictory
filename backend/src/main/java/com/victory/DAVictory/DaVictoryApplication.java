package com.victory.DAVictory;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class DaVictoryApplication {

	public static void main(String[] args) {
		SpringApplication.run(DaVictoryApplication.class, args);
	}

}
