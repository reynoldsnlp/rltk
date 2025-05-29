package werti.resources;

import werti.Language;

import java.io.InputStream;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-08
 */
public interface CachingResource {
    <T> T request(
            Language language,
            ResourceLoader<Object, T> create,
            Class<T> resourceClass
    ) throws NoResourceException;

    <T> T requestFromStream(
            Language language,
            ResourceLoader<InputStream, T> create,
            Class<T> resourceClass
    ) throws NoResourceException;
}
