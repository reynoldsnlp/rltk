package werti.server.servlet;

import com.google.common.collect.ImmutableMap;
import com.google.gson.Gson;
import com.google.inject.Guice;
import com.google.inject.Inject;
import com.google.inject.name.Named;
import com.google.inject.testing.fieldbinder.Bind;
import com.google.inject.testing.fieldbinder.BoundFieldModule;
import org.junit.Before;
import org.junit.Ignore;
import org.junit.Rule;
import org.junit.Test;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnit;
import org.mockito.junit.MockitoRule;
import werti.Language;
import werti.server.modules.TopicModule;
import werti.server.modules.UimaModule;
import werti.server.views.DocumentInfo;
import werti.uima.ConvenientCas;

import java.net.URL;
import java.time.Duration;
import java.util.Map;

import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-05
 */
public class FetchletTest extends ServletTestBase {
    @Rule public MockitoRule rule = MockitoJUnit.rule();

    @Inject @Named("view-gson") private Gson gson;
    @Bind @Named("fetch-handler") @Mock
    @Inject private Fetchlet fetchlet;
    @Inject @Named("fresh-cas")
    ConvenientCas cas;

    private final String validUrl = "http://example.com";
    private final Map<String, String[]> validParameters = ImmutableMap.of(
            "url", new String[] { validUrl },
            "lang", new String[] { "en" }
    );

    @Before
    public void setUp() throws Exception {
        Guice.createInjector(
                BoundFieldModule.of(this),
                new UimaModule(),
                new TopicModule()
        ).injectMembers(this);
    }

    @Ignore @Test // see #124
    public void doGetValidConnection() throws Exception {
        // given
        final URL url = new URL(validUrl);
        final DocumentInfo documentInfo =
                DocumentInfo.create(0, url, Duration.ZERO, Language.ENGLISH);

        // when
        when(request.getParameterMap()).thenReturn(validParameters);
        fetchlet.doGet(request, response);

        // then
        verify(responseWriter).write(responseCaptor.capture());
        final DocumentInfo response =
                gson.fromJson(responseCaptor.getValue(), DocumentInfo.class);
        assertThat(
                "The document information was correctly written out",
                response,
                is(documentInfo)
        );
    }

    @Ignore @Test // see #124
    public void relayException() throws Exception {
        // when
        fetchlet.doGet(request, response);

        // then
        verify(response).sendError(100, "Test");
    }
}
