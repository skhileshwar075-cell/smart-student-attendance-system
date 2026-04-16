package com.smartattend.ui.teacher

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageButton
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.smartattend.R
import com.smartattend.domain.model.Student

class TeacherStudentsAdapter(
    private val onEdit: (Student) -> Unit,
    private val onDelete: (Student) -> Unit
) : ListAdapter<Student, TeacherStudentsAdapter.VH>(DIFF) {

    class VH(view: View) : RecyclerView.ViewHolder(view) {
        val tvInitial: TextView = view.findViewById(R.id.tvInitial)
        val tvName: TextView = view.findViewById(R.id.tvName)
        val tvEmail: TextView = view.findViewById(R.id.tvEmail)
        val tvRoll: TextView = view.findViewById(R.id.tvRoll)
        val tvStatus: TextView = view.findViewById(R.id.tvStatus)
        val btnEdit: ImageButton = view.findViewById(R.id.btnEdit)
        val btnDelete: ImageButton = view.findViewById(R.id.btnDelete)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_teacher_student, parent, false))

    override fun onBindViewHolder(holder: VH, position: Int) {
        val item = getItem(position)
        holder.tvInitial.text = item.name.firstOrNull()?.uppercase() ?: "?"
        holder.tvName.text = item.name
        holder.tvEmail.text = item.email
        holder.tvRoll.text = item.studentId?.let { "Roll: $it" } ?: ""
        holder.tvStatus.text = if (item.isActive == true) "Active" else "Inactive"
        holder.tvStatus.setTextColor(
            if (item.isActive == true)
                android.graphics.Color.parseColor("#16A34A")
            else
                android.graphics.Color.parseColor("#DC2626")
        )
        holder.btnEdit.setOnClickListener { onEdit(item) }
        holder.btnDelete.setOnClickListener { onDelete(item) }
    }

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<Student>() {
            override fun areItemsTheSame(a: Student, b: Student) = a.id == b.id
            override fun areContentsTheSame(a: Student, b: Student) = a == b
        }
    }
}
