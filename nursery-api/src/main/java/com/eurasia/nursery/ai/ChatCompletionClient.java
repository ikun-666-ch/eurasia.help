package com.eurasia.nursery.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

public interface ChatCompletionClient {
    JsonNode complete(ObjectNode payload);
}
