from django import template

from blog.models import Post

register = template.Library()


@register.simple_tag(name='total_posts')
def total_posts():
    post = Post.objects.filter(status=1).count()
    return {'total_posts': post}

@register.simple_tag(name='posts')
def total_posts():
    post = Post.objects.filter(status=1).count()
    return {'total_posts': post}

@register.filter()
def snippets(value,args=20):
    return value[:args]

@register.inclusion_tag('PopularPosts.html')
def popular_posts():
    posts = Post.objects.filter(status=1).order_by('published_date')[:20]
    return {'posts': posts}