from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("help_center", "0012_update_destination_city_country_choices"),
    ]

    operations = [
        migrations.AlterField(
            model_name="destination",
            name="country",
            field=models.CharField(
                blank=True,
                default="",
                max_length=100,
                verbose_name="Country",
            ),
        ),
    ]
