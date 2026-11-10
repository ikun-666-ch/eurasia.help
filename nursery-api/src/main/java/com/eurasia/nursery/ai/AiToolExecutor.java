package com.eurasia.nursery.ai;

import com.eurasia.nursery.domain.model.UserView;

import java.util.List;

public interface AiToolExecutor {
    List<AiTool> tools();

    Execution execute(String name, String argumentsJson, UserView caller);

    record Execution(String content, String name, String label, boolean ok) {
    }
}
