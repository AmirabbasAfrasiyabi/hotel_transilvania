from django.db import models

# Create your models here.

class Contact(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    subject = models.CharField(max_length=255)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Destination(models.Model):
    name = models.CharField(max_length=100 , verbose_name="Destination Name" )
    image = models.ImageField(upload_to="images/", null=True , blank=True )
    is_active = models.BooleanField(default=True , verbose_name="is_active")\

    display_order =models.PositiveIntegerField(default=0 , verbose_name="display_order")
    created_at = models.DateTimeField(auto_now_add=True , verbose_name="created_at")
    updated_at = models.DateTimeField(auto_now=True , verbose_name="updated_at")

    class Meta:
        ordering = ['display_order' , 'name']
        verbose_name = 'Destination'
        verbose_name_plural = 'Destinations'


    def __str__(self):
        return self.name

