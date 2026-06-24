package com.eurasia.nursery;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.eurasia.nursery.mapper")
public class NurseryApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(NurseryApiApplication.class, args);
    }
}
