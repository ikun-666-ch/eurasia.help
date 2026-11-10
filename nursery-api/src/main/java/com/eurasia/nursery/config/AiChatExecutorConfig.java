package com.eurasia.nursery.config;

import jakarta.annotation.PreDestroy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Configuration
public class AiChatExecutorConfig {

    private ExecutorService executor;

    @Bean
    public ExecutorService aiChatExecutor() {
        executor = Executors.newFixedThreadPool(4, runnable -> {
            Thread thread = new Thread(runnable, "ai-chat");
            thread.setDaemon(true);
            return thread;
        });
        return executor;
    }

    @PreDestroy
    public void shutdown() {
        if (executor != null) {
            executor.shutdownNow();
        }
    }
}
