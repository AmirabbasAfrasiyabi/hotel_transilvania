from django.shortcuts import render, get_object_or_404
from django.utils import timezone
from django.db.models import F, Q
from django.core.paginator import Paginator

from blog.models import Post


def blog_view(request, **kwargs):
    posts = Post.objects.filter(
        status=1,
        published_date__lte=timezone.now()
    )

    # Category filter
    if kwargs.get('cat_name'):
        posts = posts.filter(
            category__name__iexact=kwargs['cat_name']
        )

    # Author filter
    if kwargs.get('author_username'):
        posts = posts.filter(
            author__username=kwargs['author_username']
        )

    # Pagination
    paginator = Paginator(posts, 2)
    page_number = request.GET.get('page')
    posts = paginator.get_page(page_number)

    context = {
        'posts': posts,
    }

    return render(
        request,
        'blog/blog-home.html',
        context
    )


def blog_single(request, pid):
    post = get_object_or_404(
        Post,
        pk=pid,
        status=1,
        published_date__lte=timezone.now()
    )

    # Increase views
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

    return render(
        request,
        'blog/blog-single.html',
        context
    )


def blog_category(request, cat_name):
    posts = Post.objects.filter(
        status=1,
        category__name__iexact=cat_name,
        published_date__lte=timezone.now()
    )

    # Pagination
    paginator = Paginator(posts, 2)
    page_number = request.GET.get('page')
    posts = paginator.get_page(page_number)

    context = {
        'posts': posts,
    }

    return render(
        request,
        'blog/blog-home.html',
        context
    )


def blog_search(request):
    posts = Post.objects.filter(
        status=1,
        published_date__lte=timezone.now()
    )

    search = request.GET.get('search')

    if search:
        posts = posts.filter(
            Q(title__icontains=search) |
            Q(content__icontains=search)
        )

    # Pagination
    paginator = Paginator(posts, 2)
    page_number = request.GET.get('page')
    posts = paginator.get_page(page_number)

    context = {
        'posts': posts,
        'search': search,
    }

    return render(
        request,
        'blog/blog-home.html',
        context
    )