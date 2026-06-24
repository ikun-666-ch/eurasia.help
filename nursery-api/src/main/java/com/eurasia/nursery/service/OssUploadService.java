package com.eurasia.nursery.service;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;
import com.aliyun.oss.HttpMethod;
import com.aliyun.oss.model.GeneratePresignedUrlRequest;

import java.net.URL;
import java.util.Date;

@Service
public class OssUploadService {

    private static final String ENDPOINT = env("OSS_ENDPOINT", "oss-cn-chengdu.aliyuncs.com");
    private static final String ACCESS_KEY_ID = env("OSS_ACCESS_KEY_ID", "");
    private static final String ACCESS_KEY_SECRET = env("OSS_ACCESS_KEY_SECRET", "");
    private static final String BUCKET = env("OSS_BUCKET", "eurasia");
    private static final String BASE_PATH = "media/";

    private static String env(String key, String fallback) {
        String v = System.getenv(key);
        return v != null && !v.isEmpty() ? v : fallback;
    }

    public String upload(MultipartFile file) throws IOException {
        String dateDir = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
        String ext = extension(file.getOriginalFilename());
        String objectName = BASE_PATH + dateDir + "/" + UUID.randomUUID() + ext;

        OSS ossClient = new OSSClientBuilder().build(ENDPOINT, ACCESS_KEY_ID, ACCESS_KEY_SECRET);
        try (InputStream in = file.getInputStream()) {
            ossClient.putObject(BUCKET, objectName, in);
            return "https://" + BUCKET + "." + ENDPOINT + "/" + objectName;
        } finally {
            ossClient.shutdown();
        }
    }

    public Map<String, String> generatePresignedUpload(String originalFilename) {
        String dateDir = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
        String ext = extension(originalFilename);
        String objectName = BASE_PATH + dateDir + "/" + UUID.randomUUID() + ext;

        OSS ossClient = new OSSClientBuilder().build(ENDPOINT, ACCESS_KEY_ID, ACCESS_KEY_SECRET);
        try {
            Date expiration = new Date(System.currentTimeMillis() + 5 * 60 * 1000);
            GeneratePresignedUrlRequest req = new GeneratePresignedUrlRequest(BUCKET, objectName, HttpMethod.PUT);
            req.setExpiration(expiration);
            req.setContentType("application/octet-stream");
            URL presignedUrl = ossClient.generatePresignedUrl(req);
            String uploadUrl = presignedUrl.toString().replace("http://", "https://");
            String publicUrl = "https://" + BUCKET + "." + ENDPOINT + "/" + objectName;
            return Map.of("uploadUrl", uploadUrl, "publicUrl", publicUrl);
        } finally {
            ossClient.shutdown();
        }
    }

    private String extension(String filename) {
        if (filename == null)
            return "";
        int idx = filename.lastIndexOf('.');
        return idx < 0 ? "" : filename.substring(idx).toLowerCase();
    }

}
