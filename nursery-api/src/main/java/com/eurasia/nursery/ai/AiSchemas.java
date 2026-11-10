package com.eurasia.nursery.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

public final class AiSchemas {
    private AiSchemas() {
    }

    public static ObjectNode object(ObjectMapper mapper) {
        ObjectNode schema = mapper.createObjectNode();
        schema.put("type", "object");
        schema.set("properties", mapper.createObjectNode());
        return schema;
    }

    public static ObjectNode prop(ObjectMapper mapper, ObjectNode schema, String name, String type, String description) {
        ObjectNode property = mapper.createObjectNode();
        property.put("type", type);
        property.put("description", description);
        ((ObjectNode) schema.get("properties")).set(name, property);
        return property;
    }

    public static void enumProp(ObjectMapper mapper, ObjectNode schema, String name, String description, String... values) {
        ObjectNode property = prop(mapper, schema, name, "string", description);
        ArrayNode allowed = mapper.createArrayNode();
        for (String value : values) {
            allowed.add(value);
        }
        property.set("enum", allowed);
    }

    public static void arrayProp(ObjectMapper mapper, ObjectNode schema, String name, String description) {
        prop(mapper, schema, name, "array", description);
    }

    public static void require(ObjectMapper mapper, ObjectNode schema, String... names) {
        ArrayNode required = mapper.createArrayNode();
        for (String name : names) {
            required.add(name);
        }
        schema.set("required", required);
    }
}
