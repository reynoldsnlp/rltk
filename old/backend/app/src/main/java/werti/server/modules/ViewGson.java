package werti.server.modules;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.TypeAdapter;
import werti.server.data.Description;
import werti.server.data.FileDescription;
import werti.server.data.StringDescription;
import werti.server.modules.json.DescriptionTypeAdatpter;
import werti.server.modules.json.ViewTypeAdapterFactory;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-03-06
 */
public class ViewGson {
    public Gson getGson() {
        final GsonBuilder builder = new GsonBuilder();
        final TypeAdapter<Description> typeAdapter = new DescriptionTypeAdatpter();
        builder.registerTypeAdapter(Description.class, typeAdapter);
        builder.registerTypeAdapter(StringDescription.class, typeAdapter);
        builder.registerTypeAdapter(FileDescription.class, typeAdapter);
        builder.registerTypeAdapterFactory(ViewTypeAdapterFactory.create());
        builder.setPrettyPrinting();
        return builder.create();
    }
}
