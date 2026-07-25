from django.contrib.auth.models import User
from django.db import models

# Create your models here.

class Post(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField(max_length=500)
    image = models.ImageField(upload_to='blog' , default='blog/default.jpg')
    author = models.ForeignKey(User,on_delete=models.CASCADE,null=True)
    category = models.ForeignKey('Category',on_delete=models.CASCADE,null=True)
    counted_views = models.IntegerField(default=0)
    status = models.BooleanField(default=False)
    published_date = models.DateTimeField(null=True , blank=True)
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_date']
        verbose_name = 'Blog'
        verbose_name_plural = 'Blogs'

    def __str__(self):
        return "{} - {}".format(self.id, self.title)


class Category(models.Model):
    name = models.CharField(max_length=200)

    def __str__(self):
        return self.name