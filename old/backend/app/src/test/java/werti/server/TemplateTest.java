package werti.server;

import com.google.common.collect.ImmutableMap;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.trimou.Mustache;
import org.trimou.engine.MustacheEngine;
import org.trimou.engine.MustacheEngineBuilder;
import org.trimou.engine.interpolation.ThrowingExceptionMissingValueHandler;

import java.io.StringWriter;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-09-9/29/16
 */
public class TemplateTest {

    protected MustacheEngine mustacheEngine;

    @Before
    public void setUp() {
        this.mustacheEngine = MustacheEngineBuilder.newBuilder()
                .setMissingValueHandler(new ThrowingExceptionMissingValueHandler())
                .build();
    }

    @Test
    public void testPlainVariables() {
        final Mustache template = mustacheEngine.compileMustache("Test", "{{languages}}");
        final StringWriter stringWriter = new StringWriter();
        final ImmutableMap<String, String> hash = ImmutableMap.of("languages", "these are the languages");
        template.render(stringWriter, hash);

        Assert.assertEquals(
                "Template correctly compiled.",
                stringWriter.toString(),
                "these are the languages"
        );
    }
}
