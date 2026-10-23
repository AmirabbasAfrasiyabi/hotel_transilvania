from django.db import migrations, models

from help_center.destination_data import CITY_CHOICES, COUNTRY_CHOICES


class Migration(migrations.Migration):

    dependencies = [
        ("help_center", "0011_alter_destination_name_country_choices"),
    ]

    operations = [
        migrations.AlterField(
            model_name="destination",
            name="name",
            field=models.CharField(
                choices=CITY_CHOICES,
                max_length=100,
                verbose_name="Destination Name",
            ),
        ),
        migrations.AlterField(
            model_name="destination",
            name="country",
            field=models.CharField(
                blank=True,
                choices=COUNTRY_CHOICES,
                default="",
                max_length=100,
                verbose_name="Country",
            ),
        ),
    ]
