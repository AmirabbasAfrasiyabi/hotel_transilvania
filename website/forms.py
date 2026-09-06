from django import forms
from website.models import Contact

class NameForm(forms.Form):
    name = forms.CharField(max_length=255 , required=True)
    email = forms.EmailField()
    subject = forms.CharField(max_length=255)
    message = forms.CharField(widget=forms.Textarea)

class ContactForm(forms.ModelForm):
    class Meta:
        model = Contact
        fields = ('name', 'email', 'subject', 'message')
        widgets = {
            'subject': forms.TextInput(attrs={'required': False}),  
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['subject'].required = False



