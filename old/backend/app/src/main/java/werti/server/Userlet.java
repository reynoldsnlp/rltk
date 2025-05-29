package werti.server;

import com.google.gson.Gson;
import com.google.gson.JsonIOException;
import com.google.gson.JsonSyntaxException;
import com.google.inject.Singleton;
import werti.server.analysis.ViewRequestException;
import werti.server.data.TokenRequestData;
import werti.server.interaction.authentication.AuthenticationException;
import werti.server.interaction.authentication.AuthenticationService;
import werti.server.interaction.authentication.User;

import javax.inject.Inject;
import javax.inject.Named;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.BufferedReader;
import java.io.IOException;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-07-16
 */
@Singleton
public class Userlet extends HttpServlet {
    private final Gson gson;
    private final AuthenticationService authenticationService;

    @Inject
    public Userlet(
            @Named("view-gson") Gson gson,
            AuthenticationService authenticationService
    ) {
        this.gson = gson;
        this.authenticationService = authenticationService;
    }

    @Override
    protected void doPost(
            HttpServletRequest req,
            HttpServletResponse resp
    ) throws ServletException, IOException {
        try (BufferedReader requestReader = req.getReader()) {
            final TokenRequestData data = gson.fromJson(requestReader, TokenRequestData.class);
            final User user = authenticationService.authenticate(data);
            final String customToken = authenticationService.getCustomToken(user);

            resp.setContentType("application/json");
            resp.setCharacterEncoding("UTF-8");
            gson.toJson(TokenRequestData.create(customToken), resp.getWriter());
        } catch (AuthenticationException e) {
            e.respond(resp, gson);
        } catch (JsonSyntaxException | JsonIOException | IOException e) {
            new ViewRequestException(e).respond(resp, gson);
        }
    }
}
