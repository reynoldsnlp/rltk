package werti.server;

import com.google.gson.Gson;
import org.junit.Test;
import werti.server.data.TokenRequestData;
import werti.server.interaction.authentication.AuthenticationService;
import werti.server.interaction.authentication.TestAuthenticationService;
import werti.server.interaction.authentication.User;
import werti.server.modules.ViewGson;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.*;

import static org.hamcrest.core.Is.is;
import static org.junit.Assert.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-07-16
 */
public class UserletTest {
    @Test
    public void writesTokenToResponse() throws Exception {
        final Gson gson = new ViewGson().getGson();
        final AuthenticationService authenticationService = mock(AuthenticationService.class);

        final Userlet sut = new Userlet(gson, authenticationService);

        final HttpServletRequest request = mock(HttpServletRequest.class);
        final HttpServletResponse response = mock(HttpServletResponse.class);

        final User user = TestAuthenticationService.createTestUser();
        when(request.getReader()).thenReturn(new BufferedReader(new StringReader("{\"token\": \"foo\"}")));
        when(authenticationService.authenticate(TokenRequestData.create("foo"))).thenReturn(user);
        when(authenticationService.getCustomToken(user)).thenReturn("bar");
        final StringWriter stringWriter = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(stringWriter));

        sut.doPost(request, response);

        stringWriter.flush();
        final String result = stringWriter.toString();

        verify(response).setContentType("application/json");
        verify(response).setCharacterEncoding("UTF-8");

        assertThat(
                "The result should be the token 'bar'",
                gson.fromJson(result, TokenRequestData.class),
                is(TokenRequestData.create("bar"))
        );
    }
}
