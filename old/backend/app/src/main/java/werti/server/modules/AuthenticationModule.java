package werti.server.modules;

import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseCredentials;
import com.google.inject.AbstractModule;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import werti.ViewContext;
import werti.server.interaction.authentication.AccessDeniedAuthenticationService;
import werti.server.interaction.authentication.AuthenticationService;
import werti.server.interaction.authentication.FirebaseAuthenticationService;

import java.io.IOException;
import java.io.InputStream;
import java.util.Optional;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-02-23
 */
public class AuthenticationModule extends AbstractModule {
    private static final Logger log = LogManager.getLogger();
    private final AuthenticationService preconfiguredAuthenticationService;
    private final ViewContext viewContext;

    public AuthenticationModule(ViewContext viewContext) {
        this.viewContext = viewContext;
        this.preconfiguredAuthenticationService = null;
    }

    public AuthenticationModule(
            final ViewContext viewContext,
            final AuthenticationService authenticationService
    ) {
        this.viewContext = viewContext;
        this.preconfiguredAuthenticationService = authenticationService;
    }

    @Override
    protected void configure() {
        if (preconfiguredAuthenticationService != null) {
            bind(AuthenticationService.class).toInstance(preconfiguredAuthenticationService);
        } else {
            bind(AuthenticationService.class).toInstance(
                    tryToInitializeFirebase().orElse(new AccessDeniedAuthenticationService())
            );
        }
    }

    private Optional<AuthenticationService> tryToInitializeFirebase() {
        final String certificatePath = viewContext.getOrDefault(
                "firebase.certificate",
                "firebase-certificate.json"
        );

        final String firebaseUrl = viewContext.getProperty("firebase.databaseURL");

        final FirebaseOptions options;
        final ClassLoader myClassLoader = getClass().getClassLoader();
        try (InputStream certificateStream = myClassLoader.getResourceAsStream(certificatePath)) {
            if (certificateStream == null) {
                throw new IOException("Couldn't find Firebase certificate at " + certificatePath);
            }
            options = new FirebaseOptions.Builder()
                    .setCredential(FirebaseCredentials.fromCertificate(certificateStream))
                    .setDatabaseUrl(firebaseUrl)
                    .build();
        } catch (IOException e) {
            log.warn("Couldn't read Firebase certificate at " + certificatePath, e);
            return Optional.empty();
        }

        final FirebaseApp firebaseApp = FirebaseApp.initializeApp(options);
        final FirebaseAuthenticationService firebaseAuth =
                new FirebaseAuthenticationService(firebaseApp);

        return Optional.of(firebaseAuth);
    }
}
