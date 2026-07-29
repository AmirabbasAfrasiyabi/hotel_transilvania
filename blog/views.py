from django.shortcuts import render, get_object_or_404
from django.utils import timezone
from django.db.models import F

from blog.models import Post

def blog_view(request):
    posts = Post.objects.filter(
        status=1,
        published_date__lte=timezone.now()
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

    context = {'posts': post}
    return render(request, 'blog/blog-single.html', context)