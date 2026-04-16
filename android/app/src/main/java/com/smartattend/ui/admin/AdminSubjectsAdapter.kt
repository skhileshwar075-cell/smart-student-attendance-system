package com.smartattend.ui.admin

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageButton
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.smartattend.R
import com.smartattend.domain.model.Subject

class AdminSubjectsAdapter(
    private val onEdit: (Subject) -> Unit,
    private val onDelete: (Subject) -> Unit
) : ListAdapter<Subject, AdminSubjectsAdapter.VH>(DIFF) {

    class VH(view: View) : RecyclerView.ViewHolder(view) {
        val tvInitial: TextView = view.findViewById(R.id.tvInitial)
        val tvName: TextView = view.findViewById(R.id.tvName)
        val tvCode: TextView = view.findViewById(R.id.tvCode)
        val tvClass: TextView = view.findViewById(R.id.tvClass)
        val tvTeacher: TextView = view.findViewById(R.id.tvTeacher)
        val btnEdit: ImageButton = view.findViewById(R.id.btnEdit)
        val btnDelete: ImageButton = view.findViewById(R.id.btnDelete)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_admin_subject, parent, false))

    override fun onBindViewHolder(holder: VH, position: Int) {
        val item = getItem(position)
        holder.tvInitial.text = item.code.take(2).uppercase()
        holder.tvName.text = item.name
        holder.tvCode.text = item.code
        holder.tvClass.text = item.className ?: "—"
        holder.tvTeacher.text = item.teacherName?.let { "👤 $it" } ?: "No teacher assigned"
        holder.btnEdit.setOnClickListener { onEdit(item) }
        holder.btnDelete.setOnClickListener { onDelete(item) }
    }

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<Subject>() {
            override fun areItemsTheSame(a: Subject, b: Subject) = a.id == b.id
            override fun areContentsTheSame(a: Subject, b: Subject) = a == b
        }
    }
}
