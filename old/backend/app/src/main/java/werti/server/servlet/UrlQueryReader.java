package werti.server.servlet;

import javax.annotation.Nullable;
import java.util.Map;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-30
 */
public interface UrlQueryReader {
    @Nullable
    default String getScalarParameter(
            final Map<String, String[]> requestParameters,
            final String key
    ) {
        final String[] value = requestParameters.get(key);
        if (value != null && value.length == 1) {
            return value[0];
        } else {
            return null;
        }
    }
}
