package com.eurasia.nursery.ai;

/** 模型端点拒绝了 tools 字段。上层可以退回不带工具的调用。 */
public class AiToolsUnsupportedException extends RuntimeException {
    public AiToolsUnsupportedException(Throwable cause) {
        super(cause);
    }
}
