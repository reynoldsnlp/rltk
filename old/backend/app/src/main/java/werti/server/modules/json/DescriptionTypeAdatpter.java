package werti.server.modules.json;

import com.google.gson.TypeAdapter;
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonWriter;
import werti.server.data.Description;
import werti.server.data.FileDescription;
import werti.server.data.StringDescription;

import java.io.IOException;
import java.nio.file.Paths;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-15
 */
public class DescriptionTypeAdatpter extends TypeAdapter<Description> {
    @Override
    public void write(JsonWriter out, Description value) throws IOException {
        out.beginObject();
        out.name("title").value(value.getDescription());
        if (value instanceof StringDescription) {
            out.name("text").value(value.getDescription());
        }
        if (value instanceof FileDescription) {
            final FileDescription fileDescription = (FileDescription) value;
            out.name("fromFile").value(fileDescription.getFile().toString());
        }
        out.endObject();
    }

    @Override
    public Description read(JsonReader in) throws IOException {
        final DescriptionBuilder descriptionBuilder = new DescriptionBuilder();
        in.beginObject();
        while(in.hasNext()) {
            final String name = in.nextName();
            if ("title".equals(name)) {
                descriptionBuilder.setTitle(in.nextString());
            }
            if ("text".equals(name)) {
                descriptionBuilder.setStringDescription(in.nextString());
            }
            if ("fromFile".equals(name)) {
                descriptionBuilder.setDescriptionFrom(Paths.get(in.nextString()));
            }
        }
        in.endObject();
        try {
            return descriptionBuilder.build();
        } catch (DescriptionBuilder.DescriptionBuilderException e) {
            throw new IOException(e);
        }
    }
}
