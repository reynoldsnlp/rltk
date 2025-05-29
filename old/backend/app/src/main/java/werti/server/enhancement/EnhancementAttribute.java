package werti.server.enhancement;

import com.google.auto.value.AutoValue;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-12-09.12.16
 */
@AutoValue
public abstract class EnhancementAttribute {
    public abstract String key();
    public abstract String value();

    public String toData() {
        return "data-" + key() + "=\"" + value() + "\"";
    }

    public static EnhancementAttribute create(String key, String value) {
        return new AutoValue_EnhancementAttribute(key, value);
    }

    @Override
    public String toString() {
        return "[" + key() + ": " + value() + "]";
    }
}
