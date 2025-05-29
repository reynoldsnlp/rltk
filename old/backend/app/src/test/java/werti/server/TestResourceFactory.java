package werti.server;

import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import werti.ViewContext;
import werti.resources.FileBackedResource;
import werti.resources.FileBackedResourceFactory;
import werti.resources.ResourceKey;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-12
 */
public class TestResourceFactory implements FileBackedResourceFactory {
    private final Cache<ResourceKey, Object> cache;
    private ViewContext viewContext;

    public TestResourceFactory() {
        this(ViewTestContext.createTestContext());
    }

    public TestResourceFactory(ViewContext viewContext) {
        this.viewContext = viewContext;
        cache = CacheBuilder.newBuilder().build();
    }

    @Override
    public FileBackedResource create(String resourceProperty) {
        return new FileBackedResource(resourceProperty, cache, viewContext);
    }
}
