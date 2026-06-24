package com.eurasia.nursery.support;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Component
public class FileJsonStore {

    private final ObjectMapper objectMapper;

    public FileJsonStore(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public <T> T read(Path path, TypeReference<T> type, T defaultValue) {
        if (!Files.isRegularFile(path)) {
            return defaultValue;
        }
        try {
            T value = objectMapper.readValue(Files.readString(path), type);
            return value != null ? value : defaultValue;
        } catch (IOException e) {
            return defaultValue;
        }
    }

    public void write(Path path, Object data) {
        try {
            Files.createDirectories(path.getParent());
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(path.toFile(), data);
        } catch (IOException e) {
            throw new IllegalStateException("写入文件失败: " + path, e);
        }
    }
}
