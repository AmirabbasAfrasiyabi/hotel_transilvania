# Generated manually for passenger document fields and payment tracking

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("booking", "0002_passenger_passenger_type_alter_passenger_booking_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="payment_authority",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="booking",
            name="payment_ref",
            field=models.CharField(blank=True, db_index=True, max_length=100),
        ),
        migrations.AddField(
            model_name="passenger",
            name="document_type",
            field=models.CharField(
                blank=True,
                choices=[("national_id", "National ID"), ("passport", "Passport")],
                default="",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="passenger",
            name="national_id",
            field=models.CharField(
                blank=True, max_length=20, verbose_name="National ID"
            ),
        ),
    ]
