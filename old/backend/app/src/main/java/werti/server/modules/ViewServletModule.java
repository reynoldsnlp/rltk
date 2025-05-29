package werti.server.modules;

import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.google.inject.TypeLiteral;
import com.google.inject.assistedinject.FactoryModuleBuilder;
import com.google.inject.name.Names;
import com.google.inject.servlet.ServletModule;
import werti.ViewContext;
import werti.resources.CachingResource;
import werti.resources.FileBackedResource;
import werti.resources.FileBackedResourceFactory;
import werti.resources.ResourceKey;
import werti.server.Userlet;
import werti.server.servlet.*;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-15
 */
public class ViewServletModule extends ServletModule {
    private final ViewContext viewContext;

    public ViewServletModule(final ViewContext viewContext) {
        this.viewContext = viewContext;
    }

    @Override
    protected void configureServlets() {
        serve("/", "*.html").with(Mustachelet.class);
        serve("/fetch*").with(Fetchlet.class);
        serve("/view*").with(Viewlet.class);
        serve("/user*").with(Userlet.class);
        serve("/act/task").with(Tasklet.class);
        serve("/act/tracking").with(Tracklet.class);

        bind(ViewContext.class).toInstance(viewContext);
        final Cache<ResourceKey, Object> resourceCache = CacheBuilder.newBuilder().build();
        bind(new TypeLiteral<Cache<ResourceKey, Object>>(){})
                .annotatedWith(Names.named("resource-cache"))
                .toInstance(resourceCache);

        install(new FactoryModuleBuilder()
                .implement(CachingResource.class, FileBackedResource.class)
                .build(FileBackedResourceFactory.class)
        );
    }
}
