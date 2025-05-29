package werti.resources;

import com.google.common.base.Stopwatch;
import com.google.common.cache.Cache;
import com.google.inject.Inject;
import com.google.inject.assistedinject.Assisted;
import com.google.inject.name.Named;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import werti.Language;
import werti.ViewContext;

import javax.annotation.Nonnull;
import java.io.IOException;
import java.io.InputStream;
import java.io.ObjectInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.zip.GZIPInputStream;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-08
 */
public final class FileBackedResource implements CachingResource {
    private static final Logger log = LogManager.getLogger();
    private final String resourceProperty;
    private final Cache<ResourceKey, Object> cache;
    private final ViewContext viewContext;

    @Inject
    public FileBackedResource(
            @Assisted final String resourceProperty,
            @Named("resource-cache") final Cache<ResourceKey, Object> cache,
            final ViewContext viewContext
    ) {
        this.resourceProperty = resourceProperty;
        this.cache = cache;
        this.viewContext = viewContext;
    }

    @Override
    public <T> T request(
            @Nonnull final Language language,
            @Nonnull final ResourceLoader<Object, T> create,
            @Nonnull final Class<T> resourceClass
    ) throws NoResourceException {
        return requestFromStream(
                language,
                stream -> {
                    try {
                        return create.load(readObject(stream));
                    } catch (IOException | ClassNotFoundException e) {
                        throw new NoResourceException(e);
                    }
                },
                resourceClass
        );
    }

    @Override
    public <T> T requestFromStream(
            @Nonnull final Language language,
            @Nonnull final ResourceLoader<InputStream, T> create,
            @Nonnull final Class<T> resourceClass
    ) throws NoResourceException {
        final ResourceKey key = keyFor(language, resourceClass);
        try {
            final Object o = cache.get(
                    key,
                    () -> {
                        final Stopwatch timer = Stopwatch.createStarted();
                        final T resource = inputStreamFor(language, create);
                        timer.stop();
                        log.info("Loading of " + key.toString()
                                + " took " + timer.elapsed(TimeUnit.MILLISECONDS) + "ms.");
                        return resource;
                    }
            );
            return resourceClass.cast(o);
        } catch (ExecutionException e) {
            throw new NoResourceException(e);
        }
    }

    /**
     * A helper method for {@link #requestFromStream(Language, ResourceLoader, Class)} to read in
     * object files from disk.
     *
     * This will recognize gzip compression and decompress files that are gzipped.
     *
     * @param language The language the resource should have
     * @return The deserialized resource
     * @throws NoResourceException In case we can't find the resource, either in the file system
     *                          or its key in the properties.
     *
     * @see ViewContext#getResourcePath(String, Language)
     */
    @Nonnull
    private <T> T inputStreamFor(
            @Nonnull final Language language,
            @Nonnull final ResourceLoader<InputStream, T> resourceLoader
    ) throws NoResourceException {
        final Path resourcePath;
        resourcePath = viewContext.getResourcePath(resourceProperty, language);

        try (InputStream is = Files.newInputStream(resourcePath)) {
            if (isGZipped(resourcePath)) {
                try (GZIPInputStream gzis = new GZIPInputStream(is)) {
                    log.debug("Loading {} from {} as zipped file.", resourceProperty, resourcePath);
                    return resourceLoader.load(gzis);
                }
            } else {
                log.debug("Loading {} from {} as plain file.", resourceProperty, resourcePath);
                return resourceLoader.load(is);
            }
        } catch (IOException e) {
            throw new NoResourceException(e);
        }
    }

    // Reads in a resource, from an input stream and casts it to the desired type.
    @Nonnull
    private Object readObject(
            @Nonnull final InputStream is
    ) throws IOException, ClassNotFoundException {
        try (ObjectInputStream ois = new ObjectInputStream(is)) {
            return ois.readObject();
        }
    }

    // Use MIME-types for recognizing gzipped files.
    private boolean isGZipped(final Path p) throws IOException {
        final String mimeType = Files.probeContentType(p);
        if (mimeType == null) {
            log.warn("Content probe for {} failed, relying on file ending.", p);
            return p.toString().endsWith(".gz");
        }
        return "application/gzip".equals(mimeType);
    }

    private ResourceKey keyFor(final Language language, final Class<?> resourceClass) {
        return ResourceKey.create(resourceProperty, resourceClass, language);
    }
}
