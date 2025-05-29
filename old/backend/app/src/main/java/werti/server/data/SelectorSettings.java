package werti.server.data;

import com.google.auto.value.AutoValue;
import com.google.gson.Gson;
import com.google.gson.TypeAdapter;
import com.google.gson.annotations.SerializedName;
import org.apache.commons.lang.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.uima.jcas.tcas.Annotation;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Predicate;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-11-24
 */
@AutoValue
public abstract class SelectorSettings {
    private static final Logger log = LogManager.getLogger();
    abstract String type();
    @SerializedName("with") abstract Map<String, List<String>> includes();
    @SerializedName("without") abstract Map<String, List<String>> excludes();

    public static TypeAdapter<SelectorSettings> typeAdapter(Gson gson) {
        return new AutoValue_SelectorSettings.GsonTypeAdapter(gson);
    }

    public Predicate<Annotation> toPredicate() throws ViewConfigurationException {
        final Class<?> annotationClass;
        try {
            annotationClass = Class.forName(type());
            final Predicate<Annotation> positive = conjunction(includes(), annotationClass, true);
            final Predicate<Annotation> negative = conjunction(excludes(), annotationClass, false);
            return positive.and(negative.negate());
        } catch (ClassNotFoundException e) {
            throw new ViewConfigurationException(e);
        }
    }

    private Predicate<Annotation> conjunction(
            Map<String, List<String>> predicateList,
            Class<?> annotationClass,
            boolean defaultValue
    )
            throws ViewConfigurationException {
        try {
            final List<Predicate<Annotation>> predicates = new LinkedList<>();
            for (Map.Entry<String, List<String>> entry : predicateList.entrySet()) {
                final Method getter = annotationClass.getMethod(
                        "get" + StringUtils.capitalize(entry.getKey())
                );
                predicates.add(createMethodMatcher(entry.getValue(), getter));
            }

            final Predicate<Annotation> attributesMatch =
                    predicates.stream().reduce(Predicate::and).orElse(any -> defaultValue);
            return annotation -> annotationClass.isInstance(annotation)
                    && attributesMatch.test(annotation);
        } catch (NoSuchMethodException e) {
            throw new ViewConfigurationException(e);
        }
    }

    public static SelectorSettings create(String type, Map<String, List<String>> includes, Map<String, List<String>> excludes) {
        return new AutoValue_SelectorSettings(type, includes, excludes);
    }

    private Predicate<Annotation> createMethodMatcher(List<String> patterns, Method getter) {
        return annotation -> {
            try {
                return Optional.ofNullable(getter.invoke(annotation))
                               .map(Object::toString)
                               .map(value -> patterns.stream().anyMatch(value::matches))
                               .orElse(false);
            } catch (IllegalAccessException | InvocationTargetException e) {
                log.error("Selector runtime error.", e);
                return false;
            }
        };
    }
}
