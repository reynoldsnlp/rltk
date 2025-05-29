package werti.server.modules;

import com.google.inject.AbstractModule;
import com.google.inject.name.Names;
import org.skife.jdbi.v2.DBI;
import werti.server.interaction.storage.H2TaskStorage;
import werti.server.interaction.storage.H2TrackingStorage;
import werti.server.interaction.storage.TaskStorage;
import werti.server.interaction.storage.TrackingStorage;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-29
 */
public class JdbiDataModule extends AbstractModule {
    private final DBI dbi;

    public JdbiDataModule(DBI dbi) {
        this.dbi = dbi;
    }

    @Override
    protected void configure() {
        bind(DBI.class).annotatedWith(Names.named("h2-dbi")).toInstance(dbi);
        bind(TaskStorage.class).to(H2TaskStorage.class);
        bind(TrackingStorage.class).to(H2TrackingStorage.class);
    }
}
