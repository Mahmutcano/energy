package web

import (
	"embed"
	"html/template"
	"io"
)

//go:embed templates/*
var TemplateFS embed.FS

// RenderTemplate renders the layout with the specific template content.
func RenderTemplate(w io.Writer, name string, data interface{}) error {
	tmpl, err := template.ParseFS(TemplateFS, "templates/layout.html", "templates/"+name)
	if err != nil {
		return err
	}
	return tmpl.ExecuteTemplate(w, "layout", data)
}

// RenderStandalone renders a template without layout (e.g. login.html).
func RenderStandalone(w io.Writer, name string, data interface{}) error {
	tmpl, err := template.ParseFS(TemplateFS, "templates/"+name)
	if err != nil {
		return err
	}
	return tmpl.Execute(w, data)
}
