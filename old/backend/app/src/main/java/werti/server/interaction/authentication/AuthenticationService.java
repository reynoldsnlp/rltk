package werti.server.interaction.authentication;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-02-23
 */
public interface AuthenticationService {
    User authenticate(AuthenticationData request) throws AuthenticationException;
    String getCustomToken(User user) throws AuthenticationException;
}
