package com.eurasia.nursery.controller;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.eurasia.nursery.common.ApiResponse;
import com.eurasia.nursery.common.BusinessException;
import com.eurasia.nursery.service.OssUploadService;
import com.eurasia.nursery.web.RequestUser;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/upload")
public class UploadController {

    private final OssUploadService ossUploadService;

    public UploadController(OssUploadService ossUploadService) {
        this.ossUploadService = ossUploadService;
    }

    @PostMapping
    public ApiResponse<Map<String, Object>> upload(
            HttpServletRequest request,
            @RequestParam("files") List<MultipartFile> files) {
        RequestUser.require(request);
        List<String> urls = new ArrayList<>();
        for (MultipartFile file : files) {
            try {
                urls.add(ossUploadService.upload(file));
            } catch (IOException e) {
                throw new BusinessException("上传失败: " + e.getMessage());
            }
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("urls", urls);
        return ApiResponse.ok(result, "上传成功");
    }



    @GetMapping("/sign")
    public ApiResponse<Map<String, String>> signUpload(
            HttpServletRequest request,
            @RequestParam("filename") String filename) {
        RequestUser.require(request);
        return ApiResponse.ok(ossUploadService.generatePresignedUpload(filename));
    }

}
