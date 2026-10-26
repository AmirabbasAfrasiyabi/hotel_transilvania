# پاک‌سازی پوشه‌های static و statics

## تغییرات انجام‌شده در این برنچ

- فایل `mysite/settings.py` به‌روزرسانی شد:
  - فقط پوشه `static` در `STATICFILES_DIRS` باقی ماند.
  - ارجاع به `statics` حذف شد.

## کارهای باقی‌مانده (باید روی لوکال انجام دهید)

1. **ادغام فایل‌های منحصر به فرد:**
   ```bash
   # اگر پوشه hotels فقط در statics است:
   mkdir -p static/img/hotels
   cp -n statics/img/hotels/* static/img/hotels/ 2>/dev/null || true
   ```

2. **حذف پوشه statics:**
   ```bash
   rm -rf statics
   ```

3. **حذف فایل‌های جمع‌آوری‌شده از سورس (اختیاری اما توصیه‌شده):**
   ```bash
   rm -rf static/admin static/ckeditor
   ```
   (این‌ها با `python manage.py collectstatic` دوباره ساخته می‌شوند)

4. **تست:**
   ```bash
   python manage.py collectstatic --noinput --clear
   python manage.py runserver
   ```
   مطمئن شوید استایل‌ها و تصاویر درست لود می‌شوند.

5. بعد از اطمینان، این برنچ را با main ادغام کنید (Merge Pull Request).

## چرا این کار لازم بود؟

- دو پوشه `static` و `statics` تقریباً تکراری بودند.
- `static` نسخه کامل‌تر و به‌روزتر بود (مخصوصاً `main.css`).
- وجود هر دو باعث ابهام و احتمال تداخل می‌شد.
