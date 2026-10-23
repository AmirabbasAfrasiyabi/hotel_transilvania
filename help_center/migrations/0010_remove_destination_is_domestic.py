from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("help_center", "0009_alter_destination_category_alter_faq_category"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="destination",
            name="is_domestic",
        ),
    ]
