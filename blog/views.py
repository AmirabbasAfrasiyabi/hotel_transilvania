from django.shortcuts import render, get_object_or_404
from django.utils import timezone
from django.db.models import F

from blog.models import Post

def blog_view(request,**kwargs):
    posts = Post.objects.filter(
        status=1,
        published_date__lte=timezone.now()
    )
    if kwargs.get('cat_name'):
        posts = posts.filter(
            category__name=kwargs['cat_name'],
    )

    if kwargs.get('author_username'):
        posts = posts.filter(
            author__username=kwargs['author_username']
        )

    context = {'posts': posts}
    return render(request, 'blog/blog-home.html', context)


def blog_single(request, pid):
    post = get_object_or_404(
        Post,
        pk=pid,
        status=1,
        published_date__lte=timezone.now()
    )

    Post.objects.filter(pk=post.pk).update(
        counted_views=F('counted_views') + 1
    )
    post.refresh_from_db()

    base_qs = Post.objects.filter(
        status=1,
        published_date__lte=timezone.now()
    )

    next_post = base_qs.filter(
        published_date__gt=post.published_date
    ).order_by('published_date').first()

    prev_post = base_qs.filter(
        published_date__lt=post.published_date
    ).order_by('-published_date').first()
    context = {
        'posts': post,
        'next_post': next_post,
        'prev_post': prev_post,
    }
    return render(request, 'blog/blog-single.html', context)

def blog_category(request, cat_name):
    posts = Post.objects.filter(
        status=1,
        category__name=cat_name,
        published_date__lte=timezone.now()
    )

    context = {'posts': posts}
    return render(request, 'blog/blog-home.html', context)