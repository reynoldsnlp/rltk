package werti.server.modules;

import com.google.inject.AbstractModule;
import com.google.inject.name.Names;
import org.trimou.engine.MustacheEngine;
import org.trimou.engine.MustacheEngineBuilder;
import org.trimou.engine.config.EngineConfigurationKey;
import org.trimou.engine.interpolation.ThrowingExceptionMissingValueHandler;
import org.trimou.minify.Minify;
import org.trimou.servlet.locator.ServletContextTemplateLocator;
import werti.ViewContext;
import werti.server.views.DefaultView;
import werti.server.views.FirebaseApiData;
import werti.server.views.View;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-08
 */
public class MustacheletModule extends AbstractModule {
    private final ViewContext viewContext;

    public MustacheletModule(final ViewContext viewContext) {
        this.viewContext = viewContext;
    }

    @Override
    protected void configure() {
        bind(FirebaseApiData.class).toInstance(
                // TODO make error handling more graceful here
                FirebaseApiData
                        .builder()
                        .apiKey(viewContext.getOrDefault("firebase.apiKey", "please"))
                        .authDomain(viewContext.getOrDefault("firebase.authDomain", "set"))
                        .databaseUrl(viewContext.getOrDefault("firebase.databaseUrl", "your"))
                        .storageBucket(viewContext.getOrDefault("firebase.storageBucket", "firebase auth data"))
                        .build()
        );

        bind(View.class).annotatedWith(Names.named("view")).to(DefaultView.class);

        final boolean isSetPrecompileTemplates = Boolean.parseBoolean(
                viewContext.getOrDefault("templates.precompile", "false")
        );
        final boolean isSetTemplateCache = Boolean.parseBoolean(
                viewContext.getOrDefault("templates.cache", "false")
        );
        final MustacheEngine mustacheEngine = MustacheEngineBuilder.newBuilder()
                .setProperty(EngineConfigurationKey.PRECOMPILE_ALL_TEMPLATES, isSetPrecompileTemplates)
                .setProperty(EngineConfigurationKey.TEMPLATE_CACHE_ENABLED, isSetTemplateCache)
                .addTemplateLocator(ServletContextTemplateLocator.builder()
                        .setRootPath("/html")
                        .setSuffix("html")
                        .build())
                .setMissingValueHandler(new ThrowingExceptionMissingValueHandler())
                .addMustacheListener(Minify.htmlListener())
                .build();

        bind(MustacheEngine.class).annotatedWith(Names.named("mustache-engine"))
                .toInstance(mustacheEngine);
    }
}
