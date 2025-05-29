package werti.resources;

import com.google.auto.value.AutoValue;
import werti.Language;

/**
 * @author Aleksandar Dimitrov
 * @since  2016-09-09
 *
 * Used as a cache key for resources.
 *
 * @see CachingResource
 */

@AutoValue
public abstract class ResourceKey {
    static ResourceKey create(String key, Class<?> resourceClass, Language language) {
        return new AutoValue_ResourceKey(key, resourceClass, language);
    }

    abstract String key();
    abstract Class<?> resourceClass();
    abstract Language language();
}
