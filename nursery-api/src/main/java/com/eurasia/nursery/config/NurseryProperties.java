package com.eurasia.nursery.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@ConfigurationProperties(prefix = "nursery")
public class NurseryProperties {

    private Jwt jwt = new Jwt();
    private Cors cors = new Cors();
    private String dataDir = "./data";
    private String adminRegisterKeySuffix = "206116";
    private Ihuyi ihuyi = new Ihuyi();
    private List<String> authPhones = new ArrayList<>();
    private List<String> authPhoneUsernames = new ArrayList<>();
    private DeepSeek deepseek = new DeepSeek();

    public Jwt getJwt() {
        return jwt;
    }

    public void setJwt(Jwt jwt) {
        this.jwt = jwt;
    }

    public Cors getCors() {
        return cors;
    }

    public void setCors(Cors cors) {
        this.cors = cors;
    }

    public String getDataDir() {
        return dataDir;
    }

    public void setDataDir(String dataDir) {
        this.dataDir = dataDir;
    }

    public String getAdminRegisterKeySuffix() {
        return adminRegisterKeySuffix;
    }

    public void setAdminRegisterKeySuffix(String adminRegisterKeySuffix) {
        this.adminRegisterKeySuffix = adminRegisterKeySuffix;
    }

    public Ihuyi getIhuyi() {
        return ihuyi;
    }

    public void setIhuyi(Ihuyi ihuyi) {
        this.ihuyi = ihuyi;
    }

    public List<String> getAuthPhones() {
        return authPhones;
    }

    public void setAuthPhones(List<String> authPhones) {
        this.authPhones = authPhones;
    }

    public List<String> getAuthPhoneUsernames() {
        return authPhoneUsernames;
    }

    public void setAuthPhoneUsernames(List<String> authPhoneUsernames) {
        this.authPhoneUsernames = authPhoneUsernames;
    }

    public DeepSeek getDeepseek() {
        return deepseek;
    }

    public void setDeepseek(DeepSeek deepseek) {
        this.deepseek = deepseek;
    }

    public static class Jwt {
        private String secret = "change-me";
        private long ttlSeconds = 86400;

        public String getSecret() {
            return secret;
        }

        public void setSecret(String secret) {
            this.secret = secret;
        }

        public long getTtlSeconds() {
            return ttlSeconds;
        }

        public void setTtlSeconds(long ttlSeconds) {
            this.ttlSeconds = ttlSeconds;
        }
    }

    public static class Cors {
        private String allowedOrigins = "http://127.0.0.1:5173";

        public String getAllowedOrigins() {
            return allowedOrigins;
        }

        public void setAllowedOrigins(String allowedOrigins) {
            this.allowedOrigins = allowedOrigins;
        }
    }

    public static class Ihuyi {
        private String account = "";
        private String password = "";

        public String getAccount() {
            return account;
        }

        public void setAccount(String account) {
            this.account = account;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }

    public static class DeepSeek {
        private String apiKey = "";
        private String apiUrl = "https://api.deepseek.com/v1/chat/completions";
        private String model = "deepseek-chat";

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }

        public String getApiUrl() {
            return apiUrl;
        }

        public void setApiUrl(String apiUrl) {
            this.apiUrl = apiUrl;
        }

        public String getModel() {
            return model;
        }

        public void setModel(String model) {
            this.model = model;
        }
    }
}
