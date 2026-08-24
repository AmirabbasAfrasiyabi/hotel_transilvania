from datetime import timezone

from django import template

from blog.models import Post
from blog.models import Category
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

@register.inclusion_tag('blog/blog_popular_post.html')
def latest_posts(args=3):
    posts = Post.objects.filter(status=1).order_by('published_date')[:args]
    return {'posts': posts}


@register.inclusion_tag('blog/blog_post_category.html')

def post_category():
    posts = Post.objects.filter(status=1)
    categories = Category.objects.all()
    cat_dict = {}

    for name in categories:
        cat_dict[name] = Post.objects.filter(category=name).count()

    return {'categories': cat_dict}

@register.inclusion_tag('blog/index_tags/index_latest_post.html')
def home_latest_posts(count=6):
    posts = Post.objects.filter(
        status=1,

    ).order_by('published_date')[:count]

    return {'posts': posts}